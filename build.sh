# module installs
git submodule init
git submodule update
cd build/server
cp ../../package.json .
npm i
cd ../..

# compile
tsc
haxe Client/build.hxml