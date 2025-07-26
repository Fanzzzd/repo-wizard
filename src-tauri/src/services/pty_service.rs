use crate::types::CommandStreamEvent;
use anyhow::{anyhow, Result};
use once_cell::sync::Lazy;
use portable_pty::{CommandBuilder, NativePtySystem, PtyPair, PtySize, PtySystem};
use std::io::{Read, Write};
use std::path::Path;
use std::sync::{Arc, Mutex};
use tauri::ipc::Channel;
use tokio::time::{sleep, Duration};

struct PtySession {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn Write + Send>,
}

type PtySessionArc = Arc<Mutex<Option<PtySession>>>;

static PTY_SESSION: Lazy<PtySessionArc> = Lazy::new(|| Arc::new(Mutex::new(None)));

pub async fn write_to_pty(text: String) -> Result<()> {
    if let Some(session) = &mut *PTY_SESSION.lock().unwrap() {
        session
            .writer
            .write_all(text.as_bytes())
            .map_err(|e| anyhow!("Failed to write to PTY: {}", e))?;
        session
            .writer
            .flush()
            .map_err(|e| anyhow!("Failed to flush PTY: {}", e))?;
    }
    Ok(())
}

pub fn kill_pty() -> Result<()> {
    if let Some(_session) = PTY_SESSION.lock().unwrap().take() {
        // Session will be dropped here, closing the PTY
    }
    Ok(())
}

pub fn resize_pty(rows: u16, cols: u16) -> Result<()> {
    if let Some(session) = &*PTY_SESSION.lock().unwrap() {
        session
            .master
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| anyhow!("Failed to resize PTY: {}", e))
    } else {
        Ok(())
    }
}

pub async fn start_pty_session(
    cwd: &Path,
    command: Option<String>,
    on_event: Channel<CommandStreamEvent>,
) -> Result<()> {
    if PTY_SESSION.lock().unwrap().is_some() {
        return Err(anyhow!("A PTY session is already running."));
    }

    let pty_system = NativePtySystem::default();
    let pair = pty_system.openpty(PtySize::default())?;

    let mut cmd = if cfg!(target_os = "windows") {
        CommandBuilder::new("cmd.exe")
    } else {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "sh".to_string());
        CommandBuilder::new(shell)
    };
    cmd.cwd(cwd);
    cmd.env("TERM", "xterm-256color");

    let PtyPair { master, slave } = pair;
    let mut child = slave.spawn_command(cmd)?;

    let mut reader = master.try_clone_reader()?;
    let writer = master.take_writer()?;

    let session = PtySession { master, writer };
    *PTY_SESSION.lock().unwrap() = Some(session);

    if let Some(command_to_run) = command {
        sleep(Duration::from_millis(100)).await;
        if let Some(session) = &mut *PTY_SESSION.lock().unwrap() {
            writeln!(session.writer, "{}", command_to_run)?;
        }
    }

    drop(slave);

    let reader_channel = on_event.clone();
    tokio::task::spawn_blocking(move || {
        let mut buffer = [0; 2048];
        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(n) => {
                    if reader_channel
                        .send(CommandStreamEvent::Stdout(buffer[..n].to_vec()))
                        .is_err()
                    {
                        break;
                    }
                }
                Err(_) => break,
            }
        }
    });

    let finish_channel = on_event;
    tokio::task::spawn_blocking(move || {
        let _ = child.wait();
        let _ = kill_pty();
        let _ = finish_channel.send(CommandStreamEvent::Finish(
            "Shell session ended.".to_string(),
        ));
    });

    Ok(())
}
