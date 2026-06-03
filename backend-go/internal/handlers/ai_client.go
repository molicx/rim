package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type PythonAIRequest struct {
	Text         string `json:"text"`
	Provider     string `json:"provider"`
	Model        string `json:"model"`
	APIKey       string `json:"api_key"`
	ProviderType string `json:"provider_type,omitempty"`
	BaseURL      string `json:"base_url,omitempty"`
	Length       string `json:"length,omitempty"`
	Style        string `json:"style,omitempty"`
}

type PythonAIResponse struct {
	Summary   string   `json:"summary"`
	KeyPoints []string `json:"key_points"`
}

func CallPythonAI(pythonAIURL string, req PythonAIRequest) (*PythonAIResponse, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	resp, err := http.Post(pythonAIURL+"/api/v1/summarize", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("AI service returned status %d: %s", resp.StatusCode, string(body))
	}

	var aiResp PythonAIResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResp); err != nil {
		return nil, err
	}

	return &aiResp, nil
}
