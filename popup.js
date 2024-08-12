document.addEventListener('DOMContentLoaded', function() {
  var extractButton = document.getElementById('extractButton');
  var exportButton = document.getElementById('exportButton');
  var resultDiv = document.getElementById('result');
  var userListDiv = document.getElementById('userList');
  var statsDiv = document.getElementById('stats');

  var extractedUsers = [];

  // 更新样式
  var style = document.createElement('style');
  style.textContent = `
    body {
      width: 600px;
      height: 600px;
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    .container {
      height: 100%;
      overflow-y: auto;
      padding: 20px;
      box-sizing: border-box;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
      position: sticky;
      top: 0;
    }
    .name-column {
      width: 20%;
    }
    .username-column {
      width: 20%;
    }
    .bio-column {
      width: 60%;
    }
    #extractButton, #exportButton {
      margin: 10px 0;
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
    }
    #result, #stats {
      margin: 10px 0;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);

  // 创建一个容器来包裹所有内容
  var container = document.createElement('div');
  container.className = 'container';
  document.body.appendChild(container);

  // 将所有现有内容移动到新容器中
  while (document.body.firstChild !== container) {
    container.appendChild(document.body.firstChild);
  }

  extractButton.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "extract"}, function(response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          resultDiv.textContent = "Error: " + chrome.runtime.lastError.message;
        } else if (response && response.status === "started") {
          resultDiv.textContent = "Extracting...";
          userListDiv.textContent = ""; // Clear previous results
          statsDiv.textContent = ""; // Clear previous stats
          exportButton.style.display = 'none'; // Hide export button while extracting
        } else {
          resultDiv.textContent = "Unexpected response";
        }
      });
    });
  });

  exportButton.addEventListener('click', function() {
    exportToCsv(extractedUsers);
  });

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "updateFollowingList") {
      extractedUsers = request.followingList;
      resultDiv.textContent = `Extracted ${extractedUsers.length} users so far...`;
      
      // Display the user list
      userListDiv.innerHTML = '<h3>Extracted Users:</h3>';
      var table = document.createElement('table');
      table.innerHTML = `
        <tr>
          <th class="name-column">Name</th>
          <th class="username-column">Username</th>
          <th class="bio-column">Bio</th>
        </tr>
      `;
      extractedUsers.forEach(function(user) {
        var row = table.insertRow();
        row.innerHTML = `
          <td class="name-column">${escapeHtml(user.name)}</td>
          <td class="username-column">${escapeHtml(user.username)}</td>
          <td class="bio-column">${escapeHtml(user.bio)}</td>
        `;
      });
      userListDiv.appendChild(table);

      // Update stats
      statsDiv.textContent = `Total users extracted: ${extractedUsers.length}`;

      // Show export button
      exportButton.style.display = 'block';
    } else if (request.action === "extractionComplete") {
      resultDiv.textContent = `Extraction complete. Total users extracted: ${extractedUsers.length}`;
    }
  });
});

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function exportToCsv(users) {
  // 添加 BOM 以确保 Excel 正确识别 UTF-8
  let csvContent = "\uFEFF";
  csvContent += "Name,Username,Bio\n";
  
  users.forEach(function(user) {
    let row = [
      `"${escapeCsvField(user.name)}"`,
      `"${escapeCsvField(user.username)}"`,
      `"${escapeCsvField(user.bio)}"`
    ].join(",");
    csvContent += row + "\n";
  });

  // 使用 Blob 创建文件
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  // 创建下载链接
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "twitter_following.csv");
  document.body.appendChild(link);
  link.click();

  // 清理
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 辅助函数：处理 CSV 字段中的特殊字符
function escapeCsvField(field) {
  if (field == null) return '';
  return field.replace(/"/g, '""').replace(/\n/g, ' ');
}