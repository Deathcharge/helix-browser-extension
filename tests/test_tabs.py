"""Test suite for tab management."""

import pytest


class TestTabManagement:
    """Test tab management functionality."""
    
    @pytest.mark.tabs
    def test_tab_properties(self, mock_tab):
        """Test tab properties."""
        assert mock_tab.id == 1
        assert mock_tab.url == "https://example.com"
        assert mock_tab.title == "Example Site"
    
    @pytest.mark.tabs
    def test_tab_status(self, mock_tab):
        """Test tab status."""
        assert mock_tab.status == "complete"
        assert mock_tab.active is True
    
    @pytest.mark.tabs
    def test_multiple_tabs(self, mock_tabs):
        """Test multiple tabs."""
        assert len(mock_tabs) == 3
        assert mock_tabs[0].active is True
    
    @pytest.mark.tabs
    def test_tab_urls(self, mock_tabs):
        """Test tab URLs."""
        urls = [tab.url for tab in mock_tabs]
        assert len(urls) == 3
        assert all("example" in url for url in urls)
