rm -rf ./dist
cd ../frontend
pnpm build
cp -r ./dist ../backend
cd ../backend
git add .
git commit -m "deploy commands"
git push