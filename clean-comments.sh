#!/bin/bash

files=(
  "src/components/WorkQueueComponents.tsx"
  "src/lib/storage.ts"
  "src/lib/applicantsStorage.ts"
  "src/components/WorkQueueViews.tsx"
  "src/components/WorkQueueClient.tsx"
  "src/components/MobileTopBar.tsx"
  "src/components/GmailInboxPanel.tsx"
  "src/components/DealMeetingView.tsx"
  "src/components/CompanyApplicantEmails.tsx"
  "src/app/deals/new/page.client.tsx"
  "src/app/deals/[dealId]/page.tsx"
  "src/app/deals/page.tsx"
  "src/app/companies/[companyId]/record/page.tsx"
  "src/app/companies/[companyId]/jobs/page.tsx"
  "src/app/companies/[companyId]/analytics/page.tsx"
  "src/app/companies/[companyId]/page.tsx"
  "src/app/companies/page.tsx"
  "src/app/AppSidebar.tsx"
)

count=0
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Create backup
    cp "$file" "$file.tmp"
    
    # Remove decorative comment blocks using perl (more reliable than sed for multiline)
    perl -i -pe 'BEGIN{undef $/;} s|/\*\s*=+[^*]*\*+/||gs' "$file"
    
    # Clean up multiple blank lines
    perl -i -pe 's/\n\n\n+/\n\n/g' "$file"
    
    # Check if file changed
    if ! cmp -s "$file" "$file.tmp"; then
      echo "✓ $file"
      ((count++))
    fi
    rm "$file.tmp"
  fi
done

echo ""
echo "Processed $count files"
