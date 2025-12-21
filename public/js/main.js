// Lógica general de la aplicación
document.addEventListener('DOMContentLoaded', () => {
    console.log('App iniciada');

    // Ejemplo de uso de i18next dentro de la lógica
    // Asegurarse de que i18next está cargado
    if (typeof i18next !== 'undefined') {
        i18next.on('languageChanged', (lng) => {
            console.log(`Idioma cambiado a: ${lng}`);
            // Aquí puedes actualizar alertas o textos dinámicos
            // const msg = i18next.t('messages.success');
            // console.log(msg);
        });
    }
});
