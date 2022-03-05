const retry = (fn, retriesLeft = 5, interval = 1000) => 
  new Promise((resolve, reject) => {
    fn()
      .then(resolve)
      .catch((error) => {
        if (retriesLeft === 0) {
          reject(error);
          return;
        }

        setTimeout(() => {
          // console.log('retrying...')
          retry(fn, retriesLeft - 1, interval)
            .then(resolve)
            .catch(reject);
        }, interval);
      });
  });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hideElement = (element) => {
  element.style.position = 'absolute';
  element.style.top = 0;
  element.style.zIndex = -1;
}

const showElement = (element) => {
  element.style.position = '';
  element.style.top = '';
  element.style.zIndex = '';
}

const doScroll = () => {
  window.dispatchEvent(new Event("scroll"));
}

const COMMENTS_CONTAINER = "ytd-comments#comments";
const COMMENTS_TEXT_LIST = "yt-formatted-string#content-text > a";
const PRIMARY_INNER = "#primary-inner";
const GTP_REGEX = /gtt?p:?\s*\d+:\d+/
const GTP_NOTICE_HTML_PATH = chrome.runtime.getURL('gtp_notice.html')

const createQueryElementsPromise = (query) =>
  new Promise((resolve, reject) => {
    element = null;

    nodeList = document.querySelectorAll(query);

    if (nodeList.length) resolve(nodeList);
    else reject(`empty nodeList returned`);
  });

const waitForQueryElement = (query, firstOnly = true) =>
  new Promise((resolve, reject) => {
    retry(() => createQueryElementsPromise(query, firstOnly))
      .then((element) => resolve(element))
      .catch((error) =>
        reject(`element for query: ${query} not found, error: ${error}`)
      );
  });

const addGTPNotice = (href, anchorText) => fetch(GTP_NOTICE_HTML_PATH)
  .then((response) => response.text())
  .then((htmlContent) => {
    template = document.createElement('template');
    template.innerHTML = htmlContent;

    anchor = template.content.querySelector('a');
    anchor.href = href;
    anchor.innerText = anchorText;

    primary_inner = document.querySelector(PRIMARY_INNER);
    primary_inner.prepend(template.content);
  });

getGTPHref = waitForQueryElement(COMMENTS_CONTAINER)
  .then(([container]) => {
    hideElement(container);
    doScroll();
    return Promise.all([container, waitForQueryElement(COMMENTS_TEXT_LIST)]);
  })
  .then(([container, nodeList]) => {
    showElement(container);

    for(anchorTag of nodeList){
      commentText = anchorTag.parentElement.innerText;
      anchorText = anchorTag.innerText;
      href = anchorTag.href;

      gtp_found = GTP_REGEX.test(commentText);
      if (gtp_found) return { href, anchorText };
    }

    throw 'no gtp found';
  })
  .catch((error) => console.log(error));

getGTPHref
  .then(({href, anchorText}) => addGTPNotice(href, anchorText))
