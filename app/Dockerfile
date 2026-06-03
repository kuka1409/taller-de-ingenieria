# Usamos una imagen oficial de PHP con Apache incluido.
FROM php:8.2-apache

# Instalamos las extensiones de PHP necesarias para trabajar con MySQL.
RUN docker-php-ext-install pdo pdo_mysql

# Definimos el directorio de trabajo dentro del contenedor.
WORKDIR /var/www/html

# Creamos la carpeta de uploads y configuramos permisos para Apache.
# Esto permite que el servidor web pueda escribir archivos cargados desde la aplicación.
RUN mkdir -p /var/www/html/uploads \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 775 /var/www/html/uploads

# Puerto expuesto por el contenedor; Apache escucha en 80.
EXPOSE 80
