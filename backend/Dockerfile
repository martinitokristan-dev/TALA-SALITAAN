# Laravel API for Render (Docker web service, root directory: backend).
# Apache + PHP, the app's public/ folder as the web root.
FROM php:8.3-apache

# PHP extensions Laravel + MySQL/TiDB need, and the CA bundle for TiDB's TLS.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libzip-dev libicu-dev ca-certificates \
    && docker-php-ext-install pdo_mysql zip intl opcache \
    && rm -rf /var/lib/apt/lists/*

# Small server (Render free: 512 MB): few Apache workers, no .htaccess lookups outside public/.
RUN a2enmod rewrite headers \
    && sed -ri 's#/var/www/html#/var/www/html/public#g' /etc/apache2/sites-available/000-default.conf \
    && printf '<Directory /var/www/html/public>\n  AllowOverride All\n  Require all granted\n</Directory>\n' > /etc/apache2/conf-available/laravel.conf \
    && a2enconf laravel \
    && printf '<IfModule mpm_prefork_module>\n  StartServers 2\n  MinSpareServers 2\n  MaxSpareServers 6\n  MaxRequestWorkers 20\n  MaxConnectionsPerChild 500\n</IfModule>\n' > /etc/apache2/conf-available/workers.conf \
    && a2enconf workers \
    && { echo 'opcache.enable=1'; echo 'opcache.memory_consumption=96'; echo 'opcache.validate_timestamps=0'; echo 'upload_max_filesize=12M'; echo 'post_max_size=14M'; echo 'memory_limit=192M'; } > /usr/local/etc/php/conf.d/app.ini

# TiDB Cloud refuses connections without TLS. Default the CA bundle here so the
# database connection is encrypted even if the env var is missing on Render.
ENV MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html

# Dependencies first (cached between deploys when composer files do not change).
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

COPY . .
RUN composer dump-autoload --optimize --no-dev \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod +x docker/start.sh

CMD ["docker/start.sh"]
