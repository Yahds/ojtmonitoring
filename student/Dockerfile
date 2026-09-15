FROM php:8.2-apache
RUN docker-php-ext-install mysqli
COPY php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY . /var/www/html/
RUN rm -f /var/www/html/php.ini
EXPOSE 80