document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    const messageDiv = document.getElementById('form-message');
    const submitBtn = document.getElementById('submit-btn');

    // TU CORREO ELECTRÓNICO (Donde recibirás los mensajes)
    const DESTINATION_EMAIL = "6251c0904f08bb42dab8ec2ffa37244c";

    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Evita que la página se recargue

            // Deshabilitar botón y mostrar estado de carga
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = 'Enviando...';
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.7';

            // Preparar datos
            const formData = new FormData(contactForm);

            // Enviar a FormSubmit usando AJAX
            fetch(`https://formsubmit.co/ajax/${DESTINATION_EMAIL}`, {
                method: "POST",
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Éxito
                showMessage('¡Mensaje enviado con éxito! Te responderemos pronto.', 'success');
                contactForm.reset(); // Limpiar formulario
            })
            .catch(error => {
                // Error
                console.error('Error:', error);
                showMessage('Hubo un error al enviar el mensaje. Intenta nuevamente.', 'error');
            })
            .finally(() => {
                // Restaurar botón
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
            });
        });
    }

    function showMessage(text, type) {
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
        
        if (type === 'success') {
            messageDiv.style.backgroundColor = 'rgba(34, 197, 94, 0.1)'; // Verde suave
            messageDiv.style.color = '#15803d'; // Verde oscuro
            messageDiv.style.border = '1px solid #22c55e';
        } else {
            messageDiv.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; // Rojo suave
            messageDiv.style.color = '#b91c1c'; // Rojo oscuro
            messageDiv.style.border = '1px solid #ef4444';
        }

        // Hacer scroll hacia el mensaje si es necesario
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});
