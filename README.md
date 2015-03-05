# FancyMerge

FancyMerge extends the GitHub pull request page to support a "fancy merge". This type of merge comes from the following example:

1. Create new branch, feature_octopus, off of master
2. Do work and commit
3. Squash commits down into single commit
4. Rebase work on top of master branch
5. Force push new branch
6. Checkout master
7. Merge feature_octopus into master; will fast-forward

# Installation

## Server
Go into the server directory:

Create a file called github.json and fill it in with your github credentials:

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

## Chrome Extension

1. Go to [chrome://extensions](chrome://extensions)
2. Make sure to check off **Developer mode**
3. Click **Load unpacked extension...**
4. Browse to the extensions directory and select the chrome directory
5. Browsing to any pull request should now show the FancyMerge button

# Usage

As long as the server is running and the extension is loaded, simply go to a pull request and use the FancyMerge button instead of the standard button. You may need to refresh to get the button to load.

# TODOs

* Utilize local storage for extension settings