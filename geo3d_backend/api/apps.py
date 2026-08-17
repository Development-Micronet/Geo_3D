from django.apps import AppConfig


class ApiConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "api"

    def ready(self):
        try:
            from api.services.storage import rebuild_index_from_disk
            rebuild_index_from_disk()
        except Exception:
            pass
