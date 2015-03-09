# FancyMerge

## Motivation
FancyMerge extends the GitHub pull request page to support a "fancy merge". A fancy merge is the equivalent of `git merge --squash` but it also updates the source branch. The benefits of this method are that feature branches are merged into master as a single commit at the tip, giving a linear commit history while still keeping GitHub informed on the state of the branch. This means you can retain a linear commit history without having to manually close or update your pull requests.

This type of merge comes from the following example:

1. Create new branch, feature_octopus, off of master
2. Do work and commit
3. Squash commits down into single commit
4. Rebase work on top of master branch
5. Force push new branch
6. Checkout master
7. Merge feature_octopus into master; will fast-forward

## Components

FancyMerge is made up of a chrome extension and a node.js server.

The chrome extension adds controls to enable FancyMerge on the current repo to your chrome url bar. If enabled for a repo, it will replace the merge button on pull requests with a fancy merge button and give you the option to enter a commit message for the commit created by the FancyMerge.

The node.js server listens for POST requests with information about a pull request. It uses the github API to find the pull request using the credentials provided during installation. Once it has identified the necessary components of the pull request it will perform the FancyMerge and push the results to github if it succeeds using your local ssh-agent credentials.

# Installation

## Server
Go into the server directory:

Create a file in ~/.fancymerge called github.json and fill it in with your github credentials:

```json
{
	"type": "basic",
	"username": "yourUsername",
	"password": "r341lys3cur3p45sw0rD"
}
```

Running the server is simple:

```bash
npm install
node index.js
```

### OSX Installation
The FancyMerge server runs as a launchd daemon

```bash
cd scripts/osx
make install
```

Log in and out and the server will run with logging to ~/.fancymerge/server.log

## Chrome Extension

1. Go to [chrome://extensions](chrome://extensions)
2. Make sure to check off **Developer mode**
3. Click **Load unpacked extension...**
4. Browse to the extensions directory and select the chrome directory
5. Browsing to any pull request should now show the FancyMerge button

# Usage

As long as the server is running and the extension is loaded, simply go to a pull request and use the FancyMerge button instead of the standard button. You may need to refresh to get the button to load.
