# module installs
git submodule init
git submodule update
cd build/server
cp -f ../../package.json .
npm i
npm audit fix
cd ../..

# compile
tsc
haxe Client/build.hxml