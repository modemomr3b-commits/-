const fs = require('fs');
const file = 'src/components/admin/UserManager.tsx';
let content = fs.readFileSync(file, 'utf-8');

content = content.replace(
  'export default function UserManager() {',
  'import { UserManagerErrorBoundary } from "./UserManagerErrorBoundary";\n\nfunction UserManagerContent() {'
);

content = content.replace(
  'return (',
  'return (\n<UserManagerErrorBoundary>\n'
);

// We need to wrap the main return, but it's easier to just export a wrapper component at the end.
content = content.replace(
  /export default function UserManager\(\) \{/,
  'function UserManagerContent() {'
);

content += `
export default function UserManager() {
  return (
    <UserManagerErrorBoundary>
      <UserManagerContent />
    </UserManagerErrorBoundary>
  );
}
`;

fs.writeFileSync(file, content);
