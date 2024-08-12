chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === "extractionComplete") {
    chrome.storage.local.set({followingList: request.followingList}, function() {
      console.log('Following list saved');
      // 发送消息到popup
      chrome.runtime.sendMessage({
        action: "extractionComplete",
        followingList: request.followingList
      });
    });
  }
});