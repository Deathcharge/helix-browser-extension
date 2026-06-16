"""Test suite for browser extension core functionality."""

import pytest


class TestExtensionConfiguration:
    """Test extension configuration."""
    
    @pytest.mark.extension
    def test_extension_config_valid(self, mock_extension_config):
        """Test extension configuration is valid."""
        assert mock_extension_config["name"] == "Helix Browser Extension"
        assert mock_extension_config["manifest_version"] == 3
    
    @pytest.mark.extension
    def test_extension_permissions(self, mock_extension_config):
        """Test extension permissions."""
        assert "activeTab" in mock_extension_config["permissions"]
        assert "scripting" in mock_extension_config["permissions"]
    
    @pytest.mark.extension
    def test_content_script_config(self, mock_content_script):
        """Test content script configuration."""
        assert mock_content_script["matches"] == ["<all_urls>"]
        assert "content.js" in mock_content_script["js"]
    
    @pytest.mark.extension
    def test_background_script_config(self, mock_background_script):
        """Test background script configuration."""
        assert "service_worker" in mock_background_script


class TestMessaging:
    """Test messaging between scripts."""
    
    @pytest.mark.messaging
    def test_message_structure(self, mock_message):
        """Test message structure."""
        assert "type" in mock_message
        assert "action" in mock_message
        assert "data" in mock_message
    
    @pytest.mark.messaging
    def test_response_structure(self, mock_response):
        """Test response structure."""
        assert mock_response["type"] == "RESPONSE"
        assert "status" in mock_response
        assert "data" in mock_response
    
    @pytest.mark.messaging
    def test_message_types(self, mock_message):
        """Test message types."""
        assert mock_message["type"] in ["REQUEST", "RESPONSE", "ERROR"]


class TestStorage:
    """Test storage functionality."""
    
    @pytest.mark.storage
    def test_storage_get(self, mock_storage):
        """Test storage get."""
        result = mock_storage.get()
        assert result is not None
    
    @pytest.mark.storage
    def test_storage_set(self, mock_storage):
        """Test storage set."""
        mock_storage.set()
        mock_storage.set.assert_called_once()
    
    @pytest.mark.storage
    def test_local_storage(self, mock_local_storage):
        """Test local storage."""
        assert "settings" in mock_local_storage
        assert "cache" in mock_local_storage
