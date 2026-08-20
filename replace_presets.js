const fs = require('fs');
let content = fs.readFileSync('src/components/admin/ProductManager.tsx', 'utf8');

const newVars = `
  const [aiCharacter, setAiCharacter] = useState<string>('woman');
  const [aiShoeCount, setAiShoeCount] = useState<string>('pair');
  const [aiShoeColor, setAiShoeColor] = useState<string>('');
`;

content = content.replace(
  "  const [aiPose, setAiPose] = useState<string>('model_seated');\n  const [aiDecorStyle, setAiDecorStyle] = useState<string>('marble');",
  newVars
);

const newPresets = `
  const characterPresets: Record<string, { label: string, prompt: string }> = {
    'woman': { label: '👩 مرأة', prompt: 'A stylish woman modeling.' },
    'man': { label: '👨 رجل', prompt: 'A stylish man modeling.' },
    'girl': { label: '👧 طفلة', prompt: 'A stylish little girl modeling.' },
    'boy': { label: '👦 طفل', prompt: 'A stylish little boy modeling.' },
    'none': { label: '❌ بدون شخصية', prompt: 'Product shot without any person.' },
  };

  const shoeCountPresets: Record<string, { label: string, prompt: string }> = {
    'one': { label: '👟 حذاء واحد', prompt: 'Displaying a single shoe.' },
    'pair': { label: '👟👟 زوج أحذية', prompt: 'Displaying a matching pair of shoes.' },
    'multiple': { label: '📦 مجموعة أحذية', prompt: 'Displaying multiple shoes in a dynamic arrangement.' },
  };

  const shoeColorPresets = [
    { label: 'اللون الأصلي', value: '' },
    { label: 'أسود', value: 'black colored shoes' },
    { label: 'أبيض', value: 'white colored shoes' },
    { label: 'أحمر', value: 'red colored shoes' },
    { label: 'أزرق', value: 'blue colored shoes' },
    { label: 'بني', value: 'brown colored shoes' },
    { label: 'وردي', value: 'pink colored shoes' },
    { label: 'ذهبي', value: 'gold colored shoes' },
    { label: 'فضي', value: 'silver colored shoes' },
  ];
`;

content = content.replace(
  /const posePresets.*urban_street.*\n    \}\n  \};\n/s,
  newPresets
);

const newPromptLogic = `
      let finalPrompt = '';
      if (aiCustomPrompt.trim().length > 0) {
        finalPrompt = aiCustomPrompt.trim();
      } else {
        const charPrompt = characterPresets[aiCharacter]?.prompt || '';
        const countPrompt = shoeCountPresets[aiShoeCount]?.prompt || '';
        const colorPrompt = aiShoeColor ? \` The shoes are \${aiShoeColor}.\` : ' The shoes maintain their original colors.';
        finalPrompt = \`\${charPrompt} \${countPrompt}\${colorPrompt} Professional 8k photography, highly detailed, photorealistic.\`;
      }
`;

content = content.replace(
  /const selectedPoseText = posePresets.*?const finalPrompt =.*?trim\(\);\n/s,
  newPromptLogic
);

// We'll write the script, then I will edit the UI with multi_edit_file to replace the AI UI section.
fs.writeFileSync('src/components/admin/ProductManager.tsx', content, 'utf8');
