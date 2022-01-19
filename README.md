# Search UI

Red Hat - Advanced Cluster Management for Kubernetes - Search UI

[![Build Status](https://travis-ci.com/stolostron/search-ui.svg?token=HNunxniixat5Aty1fpye&branch=main)](https://travis-ci.com/stolostron/search-ui)

## Development

**Important:** Make sure your `oc` client is configured to your OCP cluster (`oc login`), the token must be valid to run this app locally.

### Prerequisites

- Node.js v12.x.x
- OpenShift 4.x.x cluster
- Advanced Cluster Management installed on your OCP cluster


1.  Clone this repository
2.  From the root directory, run `npm ci`
3.  Log into you OCP env using `oc login`
4.  Run the setup script `./setup.sh`
5.  From the root directory, run `npm start`
6.  In your browser, go to `http://localhost:3000/search`


### Notes:

If you encounter a situation where the UI seems to be stuck in an authentication loop. Check your browsers cookies and besuer all the acm cookies have been removed.
To do this (in chrome):
1. Navigate to https://localhost - should see a "This site can’t be reached" error page
2. Open browsers dev tools
3. Go to the application tab
4. Click on the https://localhost cookie option in the left nav.
5. Delete all the existing cookies 
