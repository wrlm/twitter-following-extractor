let isExtracting = false;
let followingList = [];

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "extract") {
    if (!isExtracting) {
      isExtracting = true;
      followingList = [];
      extractFollowing();
      sendResponse({status: "started"});
    } else {
      sendResponse({status: "already_running"});
    }
    return true;
  }
});

function extractFollowing() {
  const cellElements = document.querySelectorAll('[data-testid="cellInnerDiv"]');
  let newUsersFound = false;

  cellElements.forEach(cellElement => {
    const userInfo = extractUserInfo(cellElement);
    if (userInfo && !followingList.some(user => user.username === userInfo.username)) {
      followingList.push(userInfo);
      newUsersFound = true;
    }
  });

  // Send update to popup
  chrome.runtime.sendMessage({
    action: "updateFollowingList",
    followingList: followingList
  });

  if (newUsersFound || followingList.length < 1000) { // Continue until we have at least 1000 users or no new users are found
    smoothScroll(() => {
      setTimeout(extractFollowing, 1000);
    });
  } else {
    console.log("Extraction complete. Total users extracted:", followingList.length);
    isExtracting = false;
    chrome.runtime.sendMessage({
      action: "extractionComplete",
      followingList: followingList
    });
  }
}

function extractUserInfo(cellElement) {
  try {
    const nameElement = cellElement.querySelector('div[dir="ltr"] > span > span');
    const usernameElement = cellElement.querySelector('div[dir="ltr"].r-1wvb978');
    const bioElement = cellElement.querySelector('div[dir="auto"].css-146c3p1.r-bcqeeo');
    
    if (nameElement && usernameElement) {
      const name = nameElement.innerText.trim();
      const username = usernameElement.innerText.trim();
      const bio = bioElement ? bioElement.innerText.trim() : "";

      if (name && username) {
        return { name, username, bio };
      }
    }
    return null;
  } catch (error) {
    console.error('Error extracting user info:', error);
    return null;
  }
}

function smoothScroll(callback) {
  const currentScroll = window.pageYOffset;
  const targetScroll = currentScroll + window.innerHeight;
  const scrollStep = Math.PI / (1000 / 60);
  const cosParameter = (targetScroll - currentScroll) / 2;
  let scrollCount = 0;
  let oldTimestamp = null;

  function step(newTimestamp) {
    if (oldTimestamp !== null) {
      scrollCount += Math.PI / (1000 / (newTimestamp - oldTimestamp));
    }
    oldTimestamp = newTimestamp;

    if (scrollCount >= Math.PI) {
      window.scrollTo(0, targetScroll);
      callback();
      return;
    }

    window.scrollTo(0, currentScroll + cosParameter * (1 - Math.cos(scrollCount)));
    window.requestAnimationFrame(step);
  }

  window.requestAnimationFrame(step);
}