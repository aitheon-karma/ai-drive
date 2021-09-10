
cat >.env <<EOL
MONGODB_URI=mongodb://isabel:3xkfKyb6PoRjWWnxsTwb@localhost:27018/isabel?authSource=isabel
DOMAIN=dev.aitheon.com
PORT=3000
EOL

npm install
cd client && npm install && cd ..
