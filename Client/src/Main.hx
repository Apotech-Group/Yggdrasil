package ;

import haxe.ui.HaxeUIApp;

class Main extends HaxeUIApp {
    public static function main() {
        final app = new HaxeUIApp();
        app.ready(() -> {
            app.addComponent(new views.MainView());
            app.title = 'Yggdrasil';
            app.icon = "icons/swirl_green.svg";
            app.start();
        });
    }
}