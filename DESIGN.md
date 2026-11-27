# Diseño de Chinchaycocha

## Dirección

Interfaz de investigación ambiental con composición editorial: fotografía real del lago, tipografía serif en portada, controles nativos y un material de agua en WebGL. El 3D es decorativo. No representa mediciones ni una simulación hidrológica.

Se retiraron los anillos, retículas, brillos de neón, mensajes promocionales y la inclinación de controles. El formulario mantiene una superficie estable de lectura. Los estilos de producción se consolidaron en `estilos.css`.

## Referencias consultadas

- [pmndrs/drei-vanilla](https://github.com/pmndrs/drei-vanilla), particularmente MeshTransmissionMaterial: referencia para transmisión, refracción, índice óptico y reflexión de un material transparente. Se implementó un shader propio y sencillo; no se instaló ni se copió la biblioteca.
- [codrops/RainEffect](https://github.com/codrops/RainEffect): referencia visual para integrar la imagen de fondo con efectos de agua. No se reutilizaron su código ni sus recursos.
- [radix-ui/primitives](https://github.com/radix-ui/primitives) y su documento de filosofía: controles reconocibles, semántica nativa, etiquetas y foco visible. No se añadió React ni Radix a un sitio que funciona con HTML y JavaScript.
- [thedaviddias/Front-End-Checklist](https://github.com/thedaviddias/Front-End-Checklist): dimensiones explícitas de la fotografía, prioridad de carga, tabla desplazable con teclado, etiquetas de unidades, adaptación móvil y verificación funcional.

## Criterios aplicados

- Fotografía original con texto alternativo, ancho/alto declarados y prioridad de carga.
- Un único archivo CSS activo; sin dependencias de componentes o animación.
- Botones nativos con estados `aria-pressed`, campos con `label` y unidades mediante `aria-describedby`.
- Tabla horizontal accesible con teclado y foco visible.
- El movimiento puede pausarse. Se respeta `prefers-reduced-motion`.
- WebGL limitado a 30 fps y densidad máxima de 1,5; se detiene fuera de vista y en pestañas ocultas. Hay alternativa SVG si WebGL no está disponible.
- La foto y el material 3D se vinculan visualmente mediante refracción y Fresnel. No hay indicadores ficticios de datos en vivo.
- Los pesos de modelos, fórmulas, criterios del ECA y clasificación del ICA permanecen separados de la presentación.

## Mapa interactivo del panel

La portada combina una superficie de color profundo con la fotografía y el material refractivo. El selector incorpora un mapa de los doce parámetros: cada modo diferencia las mediciones de entrada de los valores que estima el modelo. Las fichas de mediciones llevan el foco al campo correspondiente; las fichas estimadas explican su origen. El panel se puede plegar mediante un control nativo `details` y es accesible con teclado. La visualización representa la configuración del modelo y no añade observaciones ni modifica sus cálculos.

## Movimiento del agua

La portada añade tres capas de ondas SVG, corrientes dibujadas en canvas y ondas al mover el cursor o tocar el fondo. Las gotas suspendidas, el reflejo sobre la fotografía y la oscilación del material WebGL comparten el control de pausa. Las entradas de texto siguen completándose aunque se pause el movimiento. El canvas se limita a 25 fps y deja de actualizarse fuera de vista o con la pestaña oculta. Se respeta la preferencia de movimiento reducido. Las fichas entran en secuencia y el indicador del ICA se desplaza al presentar el resultado, sin modificar el valor numérico ni sus cálculos.

## Identidad del territorio y video de portada

La revisión del 27 de noviembre de 2026 usa una portada panorámica y un explorador de tres escenas: paisaje, zambullidor de Junín y humedales. Se contrastaron ubicación, altitud, superficie de la reserva y designación Ramsar con IGN y MINAM; el endemismo del ave con el inventario de MINCETUR; y el contexto paisajístico con SERNANP. Los enlaces están en la propia página. Las cifras de la reserva no se presentan como extensión del espejo de agua. No se añaden mediciones ambientales ni un estado actual del lago a partir de las imágenes.

El video aportado por la usuaria se recortó de 1024×576 a 752×424 (x=136, y=76). Esto excluye las posiciones superior izquierda e inferior derecha del logo y del usuario de TikTok, conservando aproximadamente la proporción 16:9. Se exportó en H.264, 24 fps, CRF 24, sin audio, sin metadatos y con faststart; duración aproximada de 20,2 s, tamaño de 1,24 MB. El original no se modifica. El cartel de respaldo se extrae del segundo 8 del resultado.

El video se reproduce silenciado y en bucle solo en la portada visible, con el documento activo y sin preferencia de movimiento reducido. Comparte el botón de pausa con el WebGL. Se detiene al elegir el atardecer y si el navegador rechaza la reproducción se mantiene la imagen de respaldo. No depende del código del simulador. `territorio.css` contiene la composición del paisaje y del explorador; `territorio.js` contiene únicamente sus controles y la reproducción. Fotografías y licencias en `assets/CREDITOS.md` y en el desplegable de créditos de la web.

## Historia de la muestra

`historia.css` y `historia.js` incorporan el recorrido solicitado: campo → laboratorio → laptop → ICA. Una escena permanece fija al lado de los cuatro capítulos en escritorio y sobre ellos en móvil. El desplazamiento y los enlaces entre etapas determinan el progreso. La botella, los tubos y la laptop se construyen con HTML, gradientes y transformaciones CSS en perspectiva; no se instala un motor 3D ni se descarga un modelo externo. La laptop se abre, revela los nueve valores de entrada y muestra tres concentraciones estimadas y el ICA del ejemplo histórico (54,56, Regular). El modo de nueve entradas se identifica como Ridge y el modo de tres como ANN, de acuerdo con el simulador actual.

La animación representa un proceso ilustrativo, no un monitoreo en vivo ni trabajo de campo realizado por la aplicación. Sus números corresponden al ejemplo que ya mostraba la página; no se generan nuevas predicciones al deslizar. El controlador de desplazamiento usa requestAnimationFrame, actúa solo en la sección visible y no lee ni escribe los campos del formulario. La preferencia de movimiento reducido elimina transiciones y animaciones, manteniendo los cambios de etapa y los textos. El cierre enlaza directamente al simulador real; la galería del ecosistema queda después de este para conservar la continuidad del recorrido.
