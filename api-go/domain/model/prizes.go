package model

import "time"

// Prizes は public.prizes テーブルのモデルです
type Prizes struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	IS_WON    bool      `json:"is_won" gorm:"not null"`
	IMAGE_ID  int       `json:"image_id"`
	NAME_JP   string	`json:""`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}