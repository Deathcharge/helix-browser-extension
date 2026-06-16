"""Comprehensive pytest configuration and fixtures for helix-browser-extension."""

import pytest
from unittest.mock import Mock, MagicMock, patch
import asyncio


# ============================================================================
# Browser Extension Fixtures
# ============================================================================

@pytest.fixture
def mock_extension_config():
    """Mock extension configuration."""
    return {
        "name": "Helix Browser Extension",
        "version": "1.0.0",
        "manifest_version": 3,
        "permissions": ["activeTab", "scripting"],
        "host_permissions": ["<all_urls>"]
    }


@pytest.fixture
def mock_content_script():
    """Mock content script."""
    return {
        "matches": ["<all_urls>"],
        "js": ["content.js"],
        "run_at": "document_end"
    }


@pytest.fixture
def mock_background_script():
    """Mock background script."""
    return {
        "service_worker": "background.js"
    }


# ============================================================================
# Message Fixtures
# ============================================================================

@pytest.fixture
def mock_message():
    """Mock message from content script."""
    return {
        "type": "REQUEST",
        "action": "analyze",
        "data": {"url": "https://example.com"}
    }


@pytest.fixture
def mock_response():
    """Mock response message."""
    return {
        "type": "RESPONSE",
        "status": "success",
        "data": {"result": "analyzed"}
    }


# ============================================================================
# Storage Fixtures
# ============================================================================

@pytest.fixture
def mock_storage():
    """Mock browser storage."""
    storage = MagicMock()
    storage.get = MagicMock(return_value={"key": "value"})
    storage.set = MagicMock()
    storage.remove = MagicMock()
    storage.clear = MagicMock()
    return storage


@pytest.fixture
def mock_local_storage():
    """Mock local storage."""
    return {
        "settings": {"theme": "dark"},
        "cache": {"data": "cached"}
    }


# ============================================================================
# Tab Fixtures
# ============================================================================

@pytest.fixture
def mock_tab():
    """Mock browser tab."""
    tab = MagicMock()
    tab.id = 1
    tab.url = "https://example.com"
    tab.title = "Example Site"
    tab.status = "complete"
    tab.active = True
    return tab


@pytest.fixture
def mock_tabs():
    """Mock list of tabs."""
    tabs = []
    for i in range(3):
        tab = MagicMock()
        tab.id = i
        tab.url = f"https://example{i}.com"
        tab.title = f"Site {i}"
        tab.active = (i == 0)
        tabs.append(tab)
    return tabs


# ============================================================================
# API Fixtures
# ============================================================================

@pytest.fixture
def mock_api_client():
    """Mock API client."""
    client = MagicMock()
    client.request = MagicMock(return_value={"status": "ok"})
    client.get = MagicMock(return_value={"data": []})
    client.post = MagicMock(return_value={"id": 1})
    return client


@pytest.fixture
def mock_api_response():
    """Mock API response."""
    return {
        "status": 200,
        "data": {"result": "success"},
        "headers": {"Content-Type": "application/json"}
    }


# ============================================================================
# DOM Fixtures
# ============================================================================

@pytest.fixture
def mock_dom_element():
    """Mock DOM element."""
    element = MagicMock()
    element.id = "test-element"
    element.className = "test-class"
    element.textContent = "Test Content"
    element.getAttribute = MagicMock(return_value="test-value")
    element.setAttribute = MagicMock()
    element.addEventListener = MagicMock()
    return element


@pytest.fixture
def mock_dom_document():
    """Mock DOM document."""
    doc = MagicMock()
    doc.getElementById = MagicMock(return_value=MagicMock())
    doc.querySelector = MagicMock(return_value=MagicMock())
    doc.querySelectorAll = MagicMock(return_value=[])
    doc.createElement = MagicMock(return_value=MagicMock())
    return doc


# ============================================================================
# Event Fixtures
# ============================================================================

@pytest.fixture
def mock_event():
    """Mock browser event."""
    event = MagicMock()
    event.type = "click"
    event.target = MagicMock()
    event.preventDefault = MagicMock()
    event.stopPropagation = MagicMock()
    return event


@pytest.fixture
def mock_listener():
    """Mock event listener."""
    return MagicMock()


# ============================================================================
# Error Fixtures
# ============================================================================

@pytest.fixture
def mock_error():
    """Mock error."""
    return {
        "type": "ERROR",
        "message": "Something went wrong",
        "code": "ERR_001"
    }


@pytest.fixture
def mock_error_handler():
    """Mock error handler."""
    return MagicMock()
