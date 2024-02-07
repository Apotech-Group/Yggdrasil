# module installs
git submodule init
git submodule update
cd build/server
cp -f ../../package.json .
npm i
cd ../..

# compile
tsc -v
haxe Client/build.hxml -v