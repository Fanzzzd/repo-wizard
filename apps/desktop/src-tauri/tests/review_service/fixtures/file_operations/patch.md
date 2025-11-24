
DELETE unused.rs
MOVE old_service.rs to new_service.rs
OVERWRITE utils.rs
```rust
pub fn helper() {
    println!("updated");
}

```
PATCH config.json
```json
<<<<<<< SEARCH
  "version": 1
=======
  "version": 2
>>>>>>> REPLACE
```
