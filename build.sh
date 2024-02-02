git submodule init
git submodule update
tsc
haxe \
    -cp Client/src \
    --js index.js \
    -L haxeui-html5 \
    -L haxeui-core