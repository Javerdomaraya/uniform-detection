from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to 'admin' users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.role == 'admin'

class IsSecurityUser(permissions.BasePermission):
    """
    Allows access only to 'security' users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.role == 'security'