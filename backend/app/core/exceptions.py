from fastapi import HTTPException, status


class AppError(Exception):
    """Base application error."""
    def __init__(self, message: str, code: str = "APP_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class NotFoundError(AppError):
    def __init__(self, resource: str, id: str):
        super().__init__(f"{resource} '{id}' not found", "NOT_FOUND")


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, "UNAUTHORIZED")


class ValidationError(AppError):
    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR")


class AIProviderError(AppError):
    def __init__(self, message: str, provider: str = "unknown"):
        super().__init__(f"[{provider}] {message}", "AI_PROVIDER_ERROR")
        self.provider = provider


class GenerationError(AppError):
    def __init__(self, stage: str, message: str):
        super().__init__(f"Stage '{stage}' failed: {message}", "GENERATION_ERROR")
        self.stage = stage


class ExportError(AppError):
    def __init__(self, format: str, message: str):
        super().__init__(f"Export '{format}' failed: {message}", "EXPORT_ERROR")


def to_http_exception(error: AppError) -> HTTPException:
    status_map = {
        "NOT_FOUND": status.HTTP_404_NOT_FOUND,
        "UNAUTHORIZED": status.HTTP_401_UNAUTHORIZED,
        "VALIDATION_ERROR": status.HTTP_422_UNPROCESSABLE_ENTITY,
        "AI_PROVIDER_ERROR": status.HTTP_503_SERVICE_UNAVAILABLE,
        "GENERATION_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
        "EXPORT_ERROR": status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    status_code = status_map.get(error.code, status.HTTP_500_INTERNAL_SERVER_ERROR)
    return HTTPException(status_code=status_code, detail={"code": error.code, "message": error.message})
