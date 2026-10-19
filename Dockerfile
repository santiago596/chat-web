FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html
COPY frontend/ /usr/share/nginx/html/frontend/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
