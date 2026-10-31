#!/bin/sh
# Render start: listen on Render's $PORT, update the database, cache the config, run Apache.
set -e

PORT="${PORT:-10000}"
sed -ri "s/^Listen .*/Listen ${PORT}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

php artisan package:discover --ansi
php artisan migrate --force
php artisan config:cache
php artisan route:cache
chown -R www-data:www-data storage bootstrap/cache

exec apache2-foreground
