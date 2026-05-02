from django.db import models

class Idea(models.Model):
    text = models.CharField(max_length=255)
    pros = models.JSONField(default=list)
    cons = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)