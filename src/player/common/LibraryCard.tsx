import React from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardMedia,
  Typography,
} from "@mui/material";

/** Shared artwork/title treatment, with quick controls outside the open button. */
export function LibraryCard({
  title,
  image,
  onOpen,
  action,
  children,
}: {
  title: string;
  image?: string;
  onOpen: () => void;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ position: "relative", flexShrink: 0 }}>
        <CardActionArea onClick={onOpen} aria-label={`Open ${title}`}>
          <CardMedia
            component="img"
            height="200"
            image={image}
            alt=""
            sx={{ pointerEvents: "none", bgcolor: "background.default" }}
          />
        </CardActionArea>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(0deg, #000000cc 0%, #00000011 85%)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            pointerEvents: "none",
          }}
        >
          <Typography
            variant="h5"
            component="div"
            sx={{
              flex: 1,
              minWidth: 0,
              overflowWrap: "anywhere",
              color: "white",
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          <Box
            sx={{ pointerEvents: "auto", flexShrink: 0 }}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {action}
          </Box>
        </Box>
      </Box>
      {children && (
        <Box
          sx={{ p: 1.5, flex: 1 }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {children}
        </Box>
      )}
    </Card>
  );
}
