#!/bin/bash

# Script to build all Docker images for Liquio platform
# Usage: ./build-images.sh [--registry <registry>] [--tag <tag>]

REGISTRY=""
TAG="latest"
IMAGES=()

# Parse named arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --image)
            IMAGES+=("$2")
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [--registry <registry>] [--tag <tag>] [--image <image>]..."
            echo "  --registry: Docker registry to use (optional)"
            echo "  --tag:      Docker tag to use (default: latest)"
            echo "  --image:    Specific image to build (can be used multiple times)"
            echo ""
            echo "Available images:"
            echo "  id-front, admin-front, cabinet-front, id-api, admin-api, cabinet-api,"
            echo "  external-reader, filestorage, event, gateway, manager, notification,"
            echo "  register, sign-tool, task"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Function to check if image should be built
should_build_image() {
    local service=$1
    
    # If no specific images specified, build all
    if [ ${#IMAGES[@]} -eq 0 ]; then
        return 0
    fi
    
    # Check if this service is in the IMAGES array
    for img in "${IMAGES[@]}"; do
        if [ "$img" = "$service" ]; then
            return 0
        fi
    done
    
    return 1
}

# Function to build and tag image
build_image() {
    local service=$1
    local context=$2
    local additional_contexts="$3"
    
    echo "Building $service..."
    
    if [ -n "$REGISTRY" ]; then
        IMAGE_NAME="$REGISTRY/liquio-$service:$TAG"
    else
        IMAGE_NAME="liquio-$service:$TAG"
    fi
    
    if [ -d "$context" ]; then
        if [ -n "$additional_contexts" ]; then
            # Build with additional contexts
            docker build -t "$IMAGE_NAME" $additional_contexts "$context"
        else
            # Standard build
            docker build -t "$IMAGE_NAME" "$context"
        fi
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully built $IMAGE_NAME"
        else
            echo "❌ Failed to build $IMAGE_NAME"
            exit 1
        fi
    else
        echo "❌ Directory $context not found"
        exit 1
    fi
}

echo "🚀 Building Liquio Docker images..."
echo "Registry: ${REGISTRY:-"none"}"
echo "Tag: $TAG"
if [ ${#IMAGES[@]} -gt 0 ]; then
    echo "Building specific images: ${IMAGES[*]}"
fi
echo ""

# Frontend services
should_build_image "id-front" && build_image "id-front" "./id-front"
should_build_image "admin-front" && build_image "admin-front" "./admin-front" "--build-context core=./front-core"
should_build_image "cabinet-front" && build_image "cabinet-front" "./cabinet-front" "--build-context core=./front-core"

# API services
should_build_image "id-api" && build_image "id-api" "./id-api"
should_build_image "admin-api" && build_image "admin-api" "./admin-api"
should_build_image "cabinet-api" && build_image "cabinet-api" "./cabinet-api"
should_build_image "external-reader" && build_image "external-reader" "./external-reader"
should_build_image "filestorage" && build_image "filestorage" "./filestorage"

# Core services
should_build_image "event" && build_image "event" "./event"
should_build_image "gateway" && build_image "gateway" "./gateway"
should_build_image "manager" && build_image "manager" "./manager"
should_build_image "notification" && build_image "notification" "./notification"
should_build_image "register" && build_image "register" "./register"
should_build_image "sign-tool" && build_image "sign-tool" "./sign-tool"
should_build_image "task" && build_image "task" "./task"

echo ""
echo "🎉 All images built successfully!"

if [ -n "$REGISTRY" ]; then
    echo ""
    echo "To push images to registry, run:"
    echo "docker push $REGISTRY/liquio-id-front:$TAG"
    echo "docker push $REGISTRY/liquio-admin-front:$TAG"
    echo "docker push $REGISTRY/liquio-cabinet-front:$TAG"
    echo "docker push $REGISTRY/liquio-id-api:$TAG"
    echo "docker push $REGISTRY/liquio-admin-api:$TAG"
    echo "docker push $REGISTRY/liquio-cabinet-api:$TAG"
    echo "docker push $REGISTRY/liquio-external-reader:$TAG"
    echo "docker push $REGISTRY/liquio-filestorage:$TAG"
    echo "docker push $REGISTRY/liquio-event:$TAG"
    echo "docker push $REGISTRY/liquio-gateway:$TAG"
    echo "docker push $REGISTRY/liquio-manager:$TAG"
    echo "docker push $REGISTRY/liquio-notification:$TAG"
    echo "docker push $REGISTRY/liquio-register:$TAG"
    echo "docker push $REGISTRY/liquio-sign-tool:$TAG"
    echo "docker push $REGISTRY/liquio-task:$TAG"
    echo ""
    echo "Or push all at once:"
    echo "for img in liquio-id-front liquio-admin-front liquio-cabinet-front liquio-id-api liquio-admin-api liquio-cabinet-api liquio-external-reader liquio-filestorage liquio-event liquio-gateway liquio-manager liquio-notification liquio-register liquio-sign-tool liquio-task liquio-eds-service; do docker push $REGISTRY/\$img:$TAG; done"
fi
