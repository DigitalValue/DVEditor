Para añadir el submódulo en algún proyecto diferente a zity-components, desde el root
git submodule add https://github.com/DigitalValue/DVEditor.git carpeta_origen

Para updatear en zity-components
git submodule update --init src/components/DVEditor # specific path only

Configurar para siempre actualizar submódulos en pull y push
git config submodule.recurse true git config push.recurseSubmodules on-demand

