const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  const avatarsDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  const users = await prisma.user.findMany();

  for (const user of users) {
    if (user.image && user.image.startsWith('data:image')) {
      const match = user.image.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const buffer = Buffer.from(match[2], 'base64');
        const filename = `avatar_${user.name ? user.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : user.id}.${ext}`;
        const filePath = path.join(avatarsDir, filename);
        fs.writeFileSync(filePath, buffer);

        const url = `/uploads/avatars/${filename}`;
        await prisma.user.update({
          where: { id: user.id },
          data: { image: url },
        });
        console.log(`Exported avatar for ${user.email} -> ${url}`);
      }
    }
  }
}

main().then(() => {
  console.log('Avatars migration complete');
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
