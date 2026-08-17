from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    role = models.CharField(max_length=50, default="user")  # "superadmin" | "admin" | "user"
    permissions = models.JSONField(default=list, blank=True)  # e.g. ["distance", "area"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def save(self, *args, **kwargs):
        # Automatically set role to superadmin when createsuperuser command is run
        if self.is_superuser and self.role == "user":
            self.role = "superadmin"
        super().save(*args, **kwargs)
