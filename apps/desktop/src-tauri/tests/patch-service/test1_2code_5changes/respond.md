To fix the test failures and ensure the new functionality is covered, I will update the existing tests in `test/manifest.ts` to include the new `forceTag` argument in the expectations. Additionally, I will add new tests in `test/manifest.ts` to verify `forceTag` is passed correctly from the manifest configuration, and in `test/github.ts` to verify `forceTag` triggers the tag creation.

Here are the changes:

1.  **`test/manifest.ts`**:
    *   Update `sinon.assert.calledOnceWithExactly` expectations in `createReleases` tests to include `forceTag: undefined` (since the new code passes it).
    *   Add a new test case "should create a release with force-tag" in `createReleases` suite.
    *   Add a test case to verify `force-tag` is read from the manifest config.

2.  **`test/github.ts`**:
    *   Add tests for `createRelease` with `forceTag: true` to ensure `createRef` is called.
    *   Add a test to ensure it warns but doesn't fail if `createRef` fails.

PATCH test/manifest.ts
```
<<<<<<< SEARCH
    it('should read custom include v in tag from manifest', async () => {
      const getFileContentsStub = sandbox.stub(
        github,
        'getFileContentsOnBranch'
      );
      getFileContentsStub
        .withArgs('release-please-config.json', 'main')
        .resolves(
          buildGitHubFileContent(
            fixturesPath,
            'manifest/config/include-v-in-tag.json'
          )
        )
        .withArgs('.release-please-manifest.json', 'main')
        .resolves(
          buildGitHubFileContent(
            fixturesPath,
            'manifest/versions/versions.json'
          )
        );
      const manifest = await Manifest.fromManifest(
        github,
        github.repository.defaultBranch
      );
      expect(manifest.repositoryConfig['.'].includeVInTag).to.be.false;
      expect(
        manifest.repositoryConfig['packages/bot-config-utils'].includeVInTag
      ).to.be.true;
    });

    it('should read custom labels from manifest', async () => {
=======
    it('should read custom include v in tag from manifest', async () => {
      const getFileContentsStub = sandbox.stub(
        github,
        'getFileContentsOnBranch'
      );
      getFileContentsStub
        .withArgs('release-please-config.json', 'main')
        .resolves(
          buildGitHubFileContent(
            fixturesPath,
            'manifest/config/include-v-in-tag.json'
          )
        )
        .withArgs('.release-please-manifest.json', 'main')
        .resolves(
          buildGitHubFileContent(
            fixturesPath,
            'manifest/versions/versions.json'
          )
        );
      const manifest = await Manifest.fromManifest(
        github,
        github.repository.defaultBranch
      );
      expect(manifest.repositoryConfig['.'].includeVInTag).to.be.false;
      expect(
        manifest.repositoryConfig['packages/bot-config-utils'].includeVInTag
      ).to.be.true;
    });

    it('should read force-tag from manifest', async () => {
      const getFileContentsStub = sandbox.stub(
        github,
        'getFileContentsOnBranch'
      );
      getFileContentsStub
        .withArgs('release-please-config.json', 'main')
        .resolves(
          buildGitHubFileRaw(
            JSON.stringify({
              'release-type': 'node',
              'force-tag': true,
              packages: {
                '.': {},
              },
            })
          )
        )
        .withArgs('.release-please-manifest.json', 'main')
        .resolves(
          buildGitHubFileContent(
            fixturesPath,
            'manifest/versions/versions.json'
          )
        );
      const manifest = await Manifest.fromManifest(
        github,
        github.repository.defaultBranch
      );
      expect(manifest.repositoryConfig['.'].forceTag).to.be.true;
    });

    it('should read custom labels from manifest', async () => {
>>>>>>> REPLACE
<<<<<<< SEARCH
    it('should create a draft release', async () => {
      mockPullRequests(
        github,
        [],
        [
          {
            headBranchName: 'release-please/branches/main',
            baseBranchName: 'main',
            number: 1234,
            title: 'chore: release main',
            body: pullRequestBody('release-notes/single-manifest.txt'),
            labels: ['autorelease: pending'],
            files: [],
            sha: 'abc123',
          },
        ]
      );
      const getFileContentsStub = sandbox.stub(
        github,
        'getFileContentsOnBranch'
      );
      getFileContentsStub
        .withArgs('package.json', 'main')
        .resolves(
          buildGitHubFileRaw(
            JSON.stringify({name: '@google-cloud/release-brancher'})
          )
        );
      const githubReleaseStub = mockCreateRelease(github, [
        {
          id: 123456,
          sha: 'abc123',
          tagName: 'release-brancher-v1.3.1',
          draft: true,
        },
      ]);
      const commentStub = sandbox.stub(github, 'commentOnIssue').resolves();
      const addLabelsStub = sandbox.stub(github, 'addIssueLabels').resolves();
      const removeLabelsStub = sandbox
        .stub(github, 'removeIssueLabels')
        .resolves();
      const manifest = new Manifest(
        github,
        'main',
        {
          '.': {
            releaseType: 'node',
            draft: true,
          },
        },
        {
          '.': Version.parse('1.3.1'),
        }
      );
      const releases = await manifest.createReleases();
      expect(releases).lengthOf(1);
      expect(releases[0]!.tagName).to.eql('release-brancher-v1.3.1');
      expect(releases[0]!.sha).to.eql('abc123');
      expect(releases[0]!.notes).to.eql('some release notes');
      expect(releases[0]!.draft).to.be.true;
      sinon.assert.calledOnceWithExactly(githubReleaseStub, sinon.match.any, {
        draft: true,
        prerelease: undefined,
      } as ReleaseOptions);
      sinon.assert.calledOnce(commentStub);
      sinon.assert.calledOnceWithExactly(
        addLabelsStub,
        ['autorelease: tagged'],
        1234
      );
      sinon.assert.calledOnceWithExactly(
        removeLabelsStub,
        ['autorelease: pending'],
        1234
      );
    });
=======
    it('should create a draft release', async () => {
      mockPullRequests(
        github,
        [],
        [
          {
            headBranchName: 'release-please/branches/main',
            baseBranchName: 'main',
            number: 1234,
            title: 'chore: release main',
            body: pullRequestBody('release-notes/single-manifest.txt'),
            labels: ['autorelease: pending'],
            files: [],
            sha: 'abc123',
          },
        ]
      );
      const getFileContentsStub = sandbox.stub(
        github,
        'getFileContentsOnBranch'
      );
      getFileContentsStub
        .withArgs('package.json', 'main')
        .resolves(
          buildGitHubFileRaw(
            JSON.stringify({name: '@google-cloud/release-brancher'})
          )
        );
      const githubReleaseStub = mockCreateRelease(github, [
        {
          id: 123456,
          sha: 'abc123',
          tagName: 'release-brancher-v1.3.1',
          draft: true,
        },
      ]);
      const commentStub = sandbox.stub(github, 'commentOnIssue').resolves();
      const addLabelsStub = sandbox.stub(github, 'addIssueLabels').resolves();
      const removeLabelsStub = sandbox
        .stub(github, 'removeIssueLabels')
        .resolves();
      const manifest = new Manifest(
        github,
        'main',
        {
          '.': {
            releaseType: 'node',
            draft: true,
          },
        },
        {
          '.': Version.parse('1.3.1'),
        }
      );
      const releases = await manifest.createReleases();
      expect(releases).lengthOf(1);
      expect(releases[0]!.tagName).to.eql('release-brancher-v1.3.1');
      expect(releases[0]!.sha).to.eql('abc123');
      expect(releases[0]!.notes).to.eql('some release notes');
      expect(releases[0]!.draft).to.be.true;
      sinon.assert.calledOnceWithExactly(githubReleaseStub, sinon.match.any, {
        draft: true,
        forceTag: undefined,
        prerelease: undefined,
      } as ReleaseOptions);
      sinon.assert.calledOnce(commentStub);
      sinon.assert.calledOnceWithExactly(
        addLabelsStub,
        ['autorelease: tagged'],
        1234
      );
      sinon.assert.calledOnceWithExactly(
        removeLabelsStub,
        ['autorelease: pending'],
        1234
      );
    });

    it('should create a release with force-tag', async () => {
      mockPullRequests(
        github,
        [],
        [
          {
            headBranchName: 'release-please/branches/main',
            baseBranchName: 'main',
            number: 1234,
            title: 'chore: release main',
            body: pullRequestBody('release-notes/single-manifest.txt'),
            labels: ['autorelease: pending'],
            files: [],
            sha: 'abc123',
          },
        ]
      );
      const getFileContentsStub = sandbox.stub(
        github,
        'getFileContentsOnBranch'
      );
      getFileContentsStub
        .withArgs('package.json', 'main')
        .resolves(
          buildGitHubFileRaw(
            JSON.stringify({name: '@google-cloud/release-brancher'})
          )
        );
      const githubReleaseStub = mockCreateRelease(github, [
        {
          id: 123456,
          sha: 'abc123',
          tagName: 'release-brancher-v1.3.1',
          draft: true,
        },
      ]);
      const commentStub = sandbox.stub(github, 'commentOnIssue').resolves();
      const addLabelsStub = sandbox.stub(github, 'addIssueLabels').resolves();
      const removeLabelsStub = sandbox
        .stub(github, 'removeIssueLabels')
        .resolves();
      const manifest = new Manifest(
        github,
        'main',
        {
          '.': {
            releaseType: 'node',
            draft: true,
            forceTag: true,
          },
        },
        {
          '.': Version.parse('1.3.1'),
        }
      );
      const releases = await manifest.createReleases();
      expect(releases).lengthOf(1);
      expect(releases[0]!.tagName).to.eql('release-brancher-v1.3.1');
      expect(releases[0]!.sha).to.eql('abc123');
      expect(releases[0]!.notes).to.eql('some release notes');
      expect(releases[0]!.draft).to.be.true;
      sinon.assert.calledOnceWithExactly(githubReleaseStub, sinon.match.any, {
        draft: true,
        forceTag: true,
        prerelease: undefined,
      } as ReleaseOptions);
      sinon.assert.calledOnce(commentStub);
      sinon.assert.calledOnceWithExactly(
        addLabelsStub,
        ['autorelease: tagged'],
        1234
      );
      sinon.assert.calledOnceWithExactly(
        removeLabelsStub,
        ['autorelease: pending'],
        1234
      );
    });
>>>>>>> REPLACE
<<<<<<< SEARCH
      sinon.assert.calledOnceWithExactly(githubReleaseStub, sinon.match.any, {
        draft: undefined,
        prerelease: true,
      } as ReleaseOptions);
=======
      sinon.assert.calledOnceWithExactly(githubReleaseStub, sinon.match.any, {
        draft: undefined,
        forceTag: undefined,
        prerelease: true,
      } as ReleaseOptions);
>>>>>>> REPLACE
<<<<<<< SEARCH
      sinon.assert.calledOnceWithExactly(githubReleaseStub, sinon.match.any, {
        draft: undefined,
        prerelease: false,
      } as ReleaseOptions);
=======
      sinon.assert.calledOnceWithExactly(githubReleaseStub, sinon.match.any, {
        draft: undefined,
        forceTag: undefined,
        prerelease: false,
      } as ReleaseOptions);
>>>>>>> REPLACE
```

PATCH test/github.ts
```
<<<<<<< SEARCH
    it('should create a draft release', async () => {
      req
        .post('/repos/fake/fake/releases', body => {
          snapshot(body);
          return true;
        })
        .reply(200, {
          tag_name: 'v1.2.3',
          draft: true,
          html_url: 'https://github.com/fake/fake/releases/v1.2.3',
          upload_url:
            'https://uploads.github.com/repos/fake/fake/releases/1/assets{?name,label}',
          target_commitish: 'abc123',
        });
      const release = await github.createRelease(
        {
          tag: new TagName(Version.parse('1.2.3')),
          sha: 'abc123',
          notes: 'Some release notes',
        },
        {draft: true}
      );
      req.done();
      expect(release).to.not.be.undefined;
      expect(release.tagName).to.eql('v1.2.3');
      expect(release.sha).to.eql('abc123');
      expect(release.draft).to.be.true;
    });
=======
    it('should force tag creation if forceTag is set', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createRefStub = sandbox.stub((github as any).octokit.git, 'createRef').resolves();
      req
        .post('/repos/fake/fake/releases', body => {
          snapshot(body);
          return true;
        })
        .reply(200, {
          tag_name: 'v1.2.3',
          draft: true,
          html_url: 'https://github.com/fake/fake/releases/v1.2.3',
          upload_url:
            'https://uploads.github.com/repos/fake/fake/releases/1/assets{?name,label}',
          target_commitish: 'abc123',
        });
      const release = await github.createRelease(
        {
          tag: new TagName(Version.parse('1.2.3')),
          sha: 'abc123',
          notes: 'Some release notes',
        },
        {draft: true, forceTag: true}
      );
      req.done();
      sinon.assert.calledOnceWithExactly(createRefStub, {
        owner: 'fake',
        repo: 'fake',
        ref: 'refs/tags/v1.2.3',
        sha: 'abc123',
      });
      expect(release).to.not.be.undefined;
    });

    it('should warn if force tag creation fails', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createRefStub = sandbox.stub((github as any).octokit.git, 'createRef').rejects(new Error('tag exists'));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const warnStub = sandbox.stub((github as any).logger, 'warn');
      req
        .post('/repos/fake/fake/releases', body => {
          snapshot(body);
          return true;
        })
        .reply(200, {
          tag_name: 'v1.2.3',
          draft: true,
          html_url: 'https://github.com/fake/fake/releases/v1.2.3',
          upload_url:
            'https://uploads.github.com/repos/fake/fake/releases/1/assets{?name,label}',
          target_commitish: 'abc123',
        });
      const release = await github.createRelease(
        {
          tag: new TagName(Version.parse('1.2.3')),
          sha: 'abc123',
          notes: 'Some release notes',
        },
        {draft: true, forceTag: true}
      );
      req.done();
      sinon.assert.calledOnce(createRefStub);
      sinon.assert.calledOnce(warnStub);
      expect(release).to.not.be.undefined;
    });

    it('should create a draft release', async () => {
      req
        .post('/repos/fake/fake/releases', body => {
          snapshot(body);
          return true;
        })
        .reply(200, {
          tag_name: 'v1.2.3',
          draft: true,
          html_url: 'https://github.com/fake/fake/releases/v1.2.3',
          upload_url:
            'https://uploads.github.com/repos/fake/fake/releases/1/assets{?name,label}',
          target_commitish: 'abc123',
        });
      const release = await github.createRelease(
        {
          tag: new TagName(Version.parse('1.2.3')),
          sha: 'abc123',
          notes: 'Some release notes',
        },
        {draft: true}
      );
      req.done();
      expect(release).to.not.be.undefined;
      expect(release.tagName).to.eql('v1.2.3');
      expect(release.sha).to.eql('abc123');
      expect(release.draft).to.be.true;
    });
>>>>>>> REPLACE
```