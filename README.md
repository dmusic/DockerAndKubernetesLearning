# Docker and Kubernetes - The Complete Course from Zero to Hero

This repository contains hands-on projects and exercises for learning Docker and Kubernetes concepts from scratch.

## 📚 About This Course

This is a practical learning journey through containerization and orchestration technologies. Each folder represents a specific concept or project demonstrating different aspects of Docker and Kubernetes.

## 🐳 What is Docker?

Docker is a platform for developing, shipping, and running applications in containers. Containers package software with all its dependencies, ensuring consistent behavior across different environments.

## ☸️ What is Kubernetes?

Kubernetes is an open-source container orchestration platform that automates deployment, scaling, and management of containerized applications.

---

## 📂 Projects & Concepts Covered

### 1. **Basic Dockerfile**
- **Location**: Root directory (`Dockerfile`, `hello.txt`)
- **Concepts**: Introduction to Dockerfiles, basic image creation
- **Description**: First steps in creating Docker images and understanding Dockerfile syntax

### 2. **Build Context**
- **Location**: `Build-context/`
- **Concepts**: Docker build context, `.dockerignore`, file inclusion/exclusion
- **Description**: Understanding what files are sent to Docker daemon during build and how to optimize build context

### 3. **CMD vs ENTRYPOINT**
- **Location**: `CMD-ENTRYPOINT/`
- **Concepts**: CMD instruction, ENTRYPOINT instruction, combining both
- **Description**: Learn the differences between CMD and ENTRYPOINT and when to use each

### 4. **Containerizing Express Apps**
- **Location**: `containerize-express-app/`
- **Concepts**: Node.js applications, Express framework, production containerization
- **Description**: Complete example of containerizing a Node.js/Express backend application

### 5. **Docker with Nginx**
- **Location**: `Docker-nginx/`
- **Concepts**: Nginx web server, static file serving, web server configuration
- **Description**: Deploying static websites and configuring Nginx inside containers

### 6. **Dockerizing React Applications**
- **Location**: `Dockerize-React-App/containerize-react-app/`
- **Concepts**: React applications, development vs production builds, multi-stage builds
- **Files**: 
  - `Dockerfile` - Production build
  - `Dockerfile.dev` - Development environment
- **Description**: Two-approach strategy for containerizing React apps (development and production)

### 7. **Environment Variables**
- **Location**: `Environment-Variables/`
- **Concepts**: ENV instruction, runtime configuration, environment-based settings
- **Description**: Managing configuration through environment variables in Docker containers

### 8. **Key-Value Store Project**
- **Location**: `Key-value project/` & `Key-value project original/`
- **Concepts**: Full-stack application, MongoDB integration, Docker Compose, multi-container applications
- **Features**:
  - Backend API (Node.js/Express)
  - MongoDB database
  - Docker Compose orchestration
  - Health checks
  - Database initialization scripts
- **Description**: Complete microservices example with database persistence and container orchestration

### 9. **Multi-Stage Builds**
- **Location**: `Multistage-builds/`
- **Concepts**: Multi-stage Dockerfiles, build optimization, smaller production images
- **Description**: Advanced technique to reduce final image size by separating build and runtime stages

### 10. **Optimizing Docker Images**
- **Location**: `optimizing-images/`
- **Concepts**: Layer caching, dependency optimization, image size reduction
- **Files**:
  - `Dockerfile.size` - Size optimization techniques
  - `Dockerfile.deps` - Dependency layer optimization
  - `Dockerfile.order` - Layer ordering best practices
- **Description**: Various strategies for creating efficient, smaller, and faster Docker images

### 11. **Docker Volumes**
- **Location**: `volumes/`
- **Concepts**: Data persistence, bind mounts, named volumes, volume management
- **Description**: Understanding how to persist data and share files between host and containers

---

## 🎯 Learning Objectives

- ✅ Understand containerization fundamentals
- ✅ Create optimized Docker images
- ✅ Containerize different types of applications (React, Express, etc.)
- ✅ Manage multi-container applications with Docker Compose
- ✅ Implement best practices for production deployments
- ✅ Work with volumes and data persistence
- ✅ Configure applications using environment variables
- 🔄 Learn Kubernetes orchestration (upcoming)
- 🔄 Implement CI/CD pipelines (upcoming)
- 🔄 Deploy to cloud platforms (upcoming)

---

## 🚀 Getting Started

### Prerequisites
- Docker Desktop installed
- Node.js (for running applications locally)
- Basic command line knowledge

### Running Examples

Each project folder contains its own `Dockerfile` and relevant source code. To run any example:

```bash
# Navigate to the project folder
cd <project-folder>

# Build the Docker image
docker build -t <image-name> .

# Run the container
docker run -p <host-port>:<container-port> <image-name>
```

For Docker Compose projects:
```bash
cd <project-folder>
docker-compose up
```

---

## 📝 Notes

- This repository is continuously updated as I progress through the course
- Each folder represents a standalone concept or project
- Refer to individual Dockerfiles for specific implementation details

---

## 🔗 Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Hub](https://hub.docker.com/)
- [Best Practices for Writing Dockerfiles](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)

---

**Status**: 🟢 In Progress | Last Updated: January 2026
