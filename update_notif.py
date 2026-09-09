import sys

def main():
    with open('src/components/GlobalNotifications.tsx', 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove state
    content = content.replace("const [showUpdateBanner, setShowUpdateBanner] = useState(false);", "")
    
    # Remove interval
    interval_code = """  // 5-minute timer to prompt update
  useEffect(() => {
    const timer = setInterval(() => {
      setShowUpdateBanner(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(timer);
  }, []);"""
    content = content.replace(interval_code, "")
    
    # Remove handleRefreshPage
    refresh_code = """  const handleRefreshPage = () => {
    window.location.reload();
  };"""
    content = content.replace(refresh_code, "")

    # Remove the JSX banner block
    import re
    # We will use regex to find and remove the banner AnimatePresence block
    # It starts with {/* Update Available Floating Banner */}
    # and ends right before {/* Floating In-App Notifications Toast */}
    pattern = re.compile(r'\{\/\*\s*Update Available Floating Banner\s*\*\/\}.*?\{\/\*\s*Floating In-App Notifications Toast\s*\*\/\}', re.DOTALL)
    
    content = pattern.sub('{/* Floating In-App Notifications Toast */}', content)

    with open('src/components/GlobalNotifications.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Success")

main()
