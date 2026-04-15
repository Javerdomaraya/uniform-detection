from rest_framework.throttling import SimpleRateThrottle


class ResetPasswordRateThrottle(SimpleRateThrottle):
    scope = 'reset_password'

    def get_cache_key(self, request, view):
        # Throttle by IP address (less user identifiable)
        ident = self.get_ident(request)
        return self.cache_format % {
            'scope': self.scope,
            'ident': ident,
        }
