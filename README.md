# GateWatch Uni-Guard 🎓🛡️
### Real-Time AI-Powered Student Uniform Compliance Monitoring & Tracking System

[![Django](https://img.shields.io/badge/Backend-Django%205.2-092E20?style=for-the-badge&logo=django)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/Frontend-React%2018%20%7C%20TypeScript-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![YOLOv8](https://img.shields.io/badge/Computer%20Vision-YOLOv8-FF7F00?style=for-the-badge&logo=yolo)](https://github.com/ultralytics/ultralytics)
[![DeepSORT](https://img.shields.io/badge/Tracking-DeepSORT-blue?style=for-the-badge)](https://github.com/levan92/deep_sort_realtime)
[![Firebase](https://img.shields.io/badge/Auth-Firebase%20SDK-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?style=for-the-badge&logo=mysql)](https://www.mysql.com/)

**GateWatch Uni-Guard** is an automated campus security and compliance system designed to monitor student uniform compliance in real time through gate and surveillance cameras. By combining custom-trained **YOLOv8** object detection with **DeepSORT** multi-object tracking, the system tracks individuals, detects dress code violations, captures snapshot evidence, and prevents duplicate violation logs.

---

## 📌 Table of Contents
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#1-backend-setup)
  - [Frontend Setup](#2-frontend-setup)
- [Environment Variables](#-environment-variables)
- [Roles & Permissions](#-roles--permissions)
- [Detection & Tracking Pipeline](#-detection--tracking-pipeline)
- [License](#-license)

---

## ✨ Key Features

- **Real-Time Uniform Detection**: Custom-trained YOLOv8 model (`best.pt`) detects compliant and non-compliant attire instantly across live camera feeds.
- **DeepSORT Multi-Object Tracking**: Assigns persistent track IDs to individuals across frames to eliminate duplicate violation entries for the same person.
- **Camera Stream Management**: Security personnel can manage multiple RTSP/IP or web cameras, start/stop monitoring, and view active tracks.
- **Automated Evidence Logging**: Captures timestamped violation snapshots and stores compliance logs with high-resolution image references.
- **Role-Based Access Control (RBAC)**:
  - **Admin**: Full system management, compliance analytics, violation reviews, user management.
  - **Security Personnel**: Live camera surveillance, real-time alerts, incident tracking.
- **Two-Tier Authentication**: Client-side Firebase Authentication paired with backend Django REST Framework JWT verification.
- **Analytics & Reporting**: Generates summary statistics, violation trends, and exportable logs.

---

## 🏗️ System Architecture

```mermaid
graph TD
    A[Campus Cameras / Webcams] -->|Video Feed| B[Django Backend / OpenCV]
    B -->|Frames| C[YOLOv8 Object Detector]
    C -->|Detections & Bounding Boxes| D[DeepSORT Tracker]
    D -->|Persistent Track ID| E{Violation Detected?}
    E -->|Yes (First Track Seen)| F[Save Violation Snapshot & MySQL Log]
    E -->|Already Recorded| G[Skip Duplicate Log]
    F -->|REST API / JWT| H[React Frontend Dashboard]
    I[User Login] -->|Email & Password| J[Firebase Auth]
    J -->|ID Token| K[Django Token Verification]
    K -->|JWT Auth Tokens| H
