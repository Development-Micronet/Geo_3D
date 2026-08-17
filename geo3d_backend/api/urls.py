from django.urls import path, re_path
from . import views

urlpatterns = [
    re_path(r"^health/?$", views.health_check),
    re_path(r"^auth/login/?$", views.login_view),
    re_path(r"^users/?$", views.users_view),
    re_path(r"^users/(?P<user_id>\d+)/permissions/?$", views.user_permissions_view),
    re_path(r"^users/(?P<user_id>\d+)/?$", views.user_detail_view),
    re_path(r"^packages/?$", views.packages_view),
    re_path(r"^packages/(?P<package_id>[^/]+)/?$", views.package_detail_view),
    re_path(r"^upload/?$", views.upload_view),
    re_path(r"^layers/(?P<package_id>[^/]+)/(?P<resource_path>.*)$", views.serve_layer_resource),
    re_path(r"^layers/(?P<package_id>[^/]+)/?$", views.serve_layer_resource, {"resource_path": ""}),
]
