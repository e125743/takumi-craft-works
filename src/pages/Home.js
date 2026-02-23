import MachieneImage from '../images/yolov8-test.jpg';
import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

const Home = () => {
	return (
		<div>
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "flex-start",
					height: "auto",
					pt: 2,
				}}
			>
				<Link to="/showmaciene">
					<Box sx={{
						width: '70vw',
						height: "auto",
						position: 'relative',
						"&:hover .coverFill": {
							opacity: 1,
						},
						"&:hover .hoverText": {
							opacity: 1,
						},
					}}>
					<Box
						component="img"
						src={MachieneImage}
						alt="Logo"
						className='linkImage'
						sx={{
							width: '100%',
							height: "100%",
						}}
					/>
					<Box
						className='coverFill'
						sx={{
							position: "absolute",
							inset: 0,
							opacity: 0,
							height: '100%',
							width: '100%',
							backgroundColor: "rgba(255, 255, 255, 0.8)",
							transition: "opacity 0.3s ease",
						}}
					/>
					<Typography
						className="hoverText"
						variant='h1'
						sx={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%)",
							opacity: 0,
							transition: "opacity 0.3s ease",
						}}
					>
						DetectDemo
					</Typography>
					</Box>
				</Link>
			</Box>
		</div>
	)
};

export default Home;