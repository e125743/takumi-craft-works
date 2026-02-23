import {useState} from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';
import { Link } from 'react-router-dom';

const pages = [{name:'Home', path:'/'}, {name:'DetectDemo', path:'/showmaciene'}]

const Header = () => {
    const [anchorElUser, setAnchorElUser] = useState(null);

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleOpenUserMenu = (event) => {
        console.log(event.currentTarget)
        setAnchorElUser(event.currentTarget);
    };

    return (
        <AppBar position="fixed" sx={{height: '15vh'}}>
            <Container maxWidth="xl" sx={{height: '100%'}}>
                <Toolbar disableGutters sx={{height: '100%'}}>
                    <Typography
                        variant="h6"
                        noWrap
                        component="a"
                        // href="#app-bar-with-responsive-menu"
                        sx={{
                            display: 'flex',
                            fontFamily: 'Comic Sans MS',
                            fontWeight: 700,
                            letterSpacing: '.3rem',
                            color: 'inherit',
                            textDecoration: 'none',
                        }}
                    >
                        匠_CraftWorks
                    </Typography>

                    <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                        {pages.map((page) => (
                            <Button
                                key={page.name}
                                sx={{ my: 2, color: 'white', display: 'block' }}
                            >
                                <Link to={page.path} style={{color: 'inherit', textDecoration: 'none'}}>
                                    <Typography sx={{ textAlign: 'center'}}>
                                        {page.name}
                                    </Typography>
                                </Link>
                            </Button>
                        ))}
                    </Box>

                    <Box sx={{ flexGrow: 0, marginRight: 0, marginLeft: 'auto' }}>
                        <Tooltip title="Open Links">
                            <IconButton 
                                onClick={handleOpenUserMenu} 
                                sx={{ p: 0 }}
                            >
                                <MenuIcon />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            sx={{ mt: '45px' }}
                            id="menu-appbar"
                            anchorEl={anchorElUser}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorElUser)}
                            onClose={handleCloseUserMenu}
                        >
                            {pages.map((page) => (
                                <MenuItem key={page.name} onClick={handleCloseUserMenu}>
                                    <Link to={page.path} style={{width: '100%'}}>
                                        <Typography sx={{ textAlign: 'center' }}>
                                            {page.name}
                                        </Typography>
                                    </Link>
                                </MenuItem>
                            ))}
                        </Menu>
                    </Box>
                </Toolbar>
            </Container>
        </AppBar>
    )
};

export default Header;