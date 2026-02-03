import re
import sys
from pathlib import Path

def remove_decorative_comments(content):
    # Remove decorative comment blocks like /* ======= ... ======= */
    pattern = r'/\*\s*=+[^*]*\*+/'
    content = re.sub(pattern, '', content, flags=re.MULTILINE)
    
    # Clean up excessive blank lines (more than 2)
    content = re.sub(r'\n\n\n+', '\n\n', content)
    
    return content

files_to_process = [
    "src/components/WorkQueueComponents.tsx",
    "src/lib/storage.ts",
    "src/lib/applicantsStorage.ts",
    "src/components/WorkQueueViews.tsx",
    "src/components/WorkQueueClient.tsx",
    "src/components/MobileTopBar.tsx",
    "src/components/GmailInboxPanel.tsx",
    "src/components/DealMeetingView.tsx",
    "src/components/CompanyApplicantEmails.tsx",
    "src/app/deals/new/page.client.tsx",
    "src/app/deals/[dealId]/page.tsx",
    "src/app/deals/page.tsx",
    "src/app/companies/[companyId]/record/page.tsx",
    "src/app/companies/[companyId]/jobs/page.tsx",
    "src/app/companies/[companyId]/analytics/page.tsx",
    "src/app/companies/[companyId]/page.tsx",
    "src/app/companies/page.tsx",
    "src/app/AppSidebar.tsx"
]

count = 0
for filepath in files_to_process:
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            original = f.read()
        
        modified = remove_decorative_comments(original)
        
        if original != modified:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(modified)
            count += 1
            print(f"✓ {filepath}")
    except Exception as e:
        print(f"✗ {filepath}: {e}")

print(f"\nProcessed {count} files")
