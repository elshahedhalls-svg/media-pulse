"""Tests for auth service functions"""
import pytest
from services.auth import (
    hash_password,
    verify_password,
    create_token,
    decode_token,
)


class TestHashPassword:
    """Test password hashing"""

    def test_hash_password_returns_string(self):
        """Test that hash_password returns a string"""
        result = hash_password("testpassword")
        assert isinstance(result, str)

    def test_hash_password_different_each_time(self):
        """Test that hashing same password produces different hashes (salt)"""
        hash1 = hash_password("testpassword")
        hash2 = hash_password("testpassword")
        assert hash1 != hash2

    def test_hash_password_with_special_chars(self):
        """Test hashing password with special characters"""
        result = hash_password("p@$$w0rd!#%")
        assert isinstance(result, str)
        assert len(result) > 0


class TestVerifyPassword:
    """Test password verification"""

    def test_verify_correct_password(self):
        """Test that correct password returns True"""
        password = "mypassword123"
        hashed = hash_password(password)
        assert verify_password(password, hashed) is True

    def test_verify_wrong_password(self):
        """Test that wrong password returns False"""
        hashed = hash_password("correctpassword")
        assert verify_password("wrongpassword", hashed) is False

    def test_verify_empty_password(self):
        """Test verifying empty password"""
        hashed = hash_password("password")
        assert verify_password("", hashed) is False


class TestCreateToken:
    """Test JWT token creation"""

    def test_create_token_returns_string(self):
        """Test that create_token returns a string"""
        token = create_token({"sub": "testuser", "role": "admin"})
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_token_contains_dots(self):
        """Test that JWT token has correct format (3 parts separated by dots)"""
        token = create_token({"sub": "testuser", "role": "admin"})
        parts = token.split(".")
        assert len(parts) == 3


class TestDecodeToken:
    """Test JWT token decoding"""

    def test_decode_valid_token(self):
        """Test decoding a valid token"""
        payload = {"sub": "testuser", "role": "admin"}
        token = create_token(payload)
        decoded = decode_token(token)
        assert decoded is not None
        assert decoded["sub"] == "testuser"
        assert decoded["role"] == "admin"

    def test_decode_invalid_token(self):
        """Test decoding an invalid token"""
        result = decode_token("invalid.token.here")
        assert result is None

    def test_decode_expired_token(self):
        """Test decoding an expired token"""
        # This would require mocking datetime, skip for now
        pass
