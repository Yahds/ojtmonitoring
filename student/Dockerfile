FROM php:8.2.34-apache
RUN docker-php-ext-install mysqli
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && echo 'FallbackResource /index.php' > /etc/apache2/conf-available/front-controller.conf \
    && a2enconf front-controller
COPY php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY . /var/www/html/
RUN mkdir -p /var/www/uploads && chown www-data:www-data /var/www/uploads
RUN rm -f /var/www/html/php.ini
EXPOSE 80