from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Custom Role & Permissions", {"fields": ("role", "permissions")}),
    )
    list_display = ("id", "username", "email", "role", "permissions", "is_staff", "is_superuser")
    list_filter = ("role", "is_staff", "is_superuser")
