const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client', 'src', 'pages', 'SellerDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the broken notification sidebar button section
const oldPattern = /\{notification\.actionRequired && notification\.actionType === 'move_to_hub' && \([\s\S]*?<button[\s\S]*?View Order & Move to Hub[\s\S]*?<\/button>[\s\S]*?\)\}/g;

const newButton = `{notification.actionRequired && notification.actionType === 'move_to_hub' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewNotificationDetails(notification);
                            }}
                            style={{
                              padding: "8px 16px",
                              background: "#5c4033",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            View Order & Move to Hub
                          </button>
                        )}`;

content = content.replace(oldPattern, newButton);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed SellerDashboard.jsx button handler!');
