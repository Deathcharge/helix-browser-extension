"""Test suite for DOM manipulation."""

import pytest


class TestDOMManipulation:
    """Test DOM manipulation functionality."""
    
    @pytest.mark.dom
    def test_dom_element_properties(self, mock_dom_element):
        """Test DOM element properties."""
        assert mock_dom_element.id == "test-element"
        assert mock_dom_element.className == "test-class"
    
    @pytest.mark.dom
    def test_dom_element_methods(self, mock_dom_element):
        """Test DOM element methods."""
        assert callable(mock_dom_element.getAttribute)
        assert callable(mock_dom_element.setAttribute)
        assert callable(mock_dom_element.addEventListener)
    
    @pytest.mark.dom
    def test_dom_document(self, mock_dom_document):
        """Test DOM document."""
        assert callable(mock_dom_document.getElementById)
        assert callable(mock_dom_document.querySelector)
        assert callable(mock_dom_document.querySelectorAll)
